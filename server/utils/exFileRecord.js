import { FileRecord } from "@reactioncommerce/file-collections";
import { AbsoluteUrlMixin } from "/imports/plugins/core/core/server/Reaction/absoluteUrl";
import tus from "tus-js-client";
import Logger from "@reactioncommerce/logger";

export default class ExFileRecord extends FileRecord {
  // Extending Original instead of using it, because it has a major bug which impacts us.
  constructor(document, options) {
    super(document, options);
    this.absUrlFn = AbsoluteUrlMixin.absoluteUrl;
  }

  attachData(data) {
    if (!data) throw new Error("FileRecord.attachData requires a data argument with some data");
    if (data instanceof Blob){
      this.data = data.stream();
    }
    else{
      this.data = data;
    }
    return this;
  }

  static fromBlob(blob, options) {
    if (typeof Blob === "undefined") throw new Error("FileRecord.fromBlob: Blob must be defined globally");
    if (!(blob instanceof Blob)) throw new Error("FileRecord.fromBlob: first argument is not an instance of Blob");
    const { name, size, type } = blob;
    const fileRecord = new ExFileRecord({ original: { name, size, type, updatedAt: new Date() } }, options);
    const { collection } = options;
    fileRecord.attachCollection(collection);
    return fileRecord.attachData(blob);
  }

    // Uploads the data that is attached to the FileRecord. Returns a Promise that
  // resolves with the new tempStoreId after the upload is complete.
  upload({
    // tus-js-client defaults chunkSize to Infinity but we do 5MB
    chunkSize = 5 * 1024 * 1024,
    endpoint = FileRecord.uploadEndpoint
  } = {}) {
    return new Promise((resolve, reject) => {
      if (!endpoint) {
        reject(new Error("Cannot upload file. You must pass \"endpoint\" option to FileRecord.upload or set FileRecord.uploadEndpoint"));
        return;
      }

      if (!this.data) {
        reject(new Error("Cannot upload a file that is not associated with any data"));
        return;
      }

      if (this._id) {
        reject(new Error("Cannot upload for a FileRecord that already has an ID"));
        return;
      }

      const { name, size, type } = this.infoForOriginal();

      if (!name || !size || !type) {
        reject(new Error("Cannot upload for a FileRecord until you set a name, size, and type for the original file"));
        return;
      }

      // Create a new tus upload
      this.tusUploadInstance = new tus.Upload(this.data, {
        chunkSize,
        endpoint,
        resume: true,
        retryDelays: [0, 1000, 3000, 5000],
        metadata: { name, size, type },
        uploadSize: size,
        onError(error) {
          reject(error);
        },
        onChunkComplete: (_, bytesUploaded, bytesTotal) => {
          const percentage = (bytesUploaded / bytesTotal * 100);
          this.emit("uploadProgress", { bytesUploaded, bytesTotal, percentage });
        },
        onSuccess: () => {
          const slashPieces = this.tusUploadInstance.url.split("/");
          const tempStoreId = slashPieces.pop();
          this.document.original = {
            ...this.document.original,
            tempStoreId,
            uploadedAt: new Date()
          };
          this.tusUploadInstance = null;
          resolve(tempStoreId);
        }
      });

      this.startUpload();
    });
  }
}

import { Meteor } from "meteor/meteor";
import fetch from "node-fetch";
import Logger from "@reactioncommerce/logger";

import { FileRecord } from "@reactioncommerce/file-collections";
import Blob, { BUFFER  } from "./utils";
import collections from "/imports/collections/rawCollections";

global.Blob = Blob;

async function fetchImage(imageUrl){
    return await fetch(imageUrl)
    .then(resp => {
        const buffer = Promise.await(resp.buffer());
        let ct = resp.headers && resp.headers.get('content-type') || '';
	      return Object.assign(
	        	// Prevent copying
	        	new Blob([], {
	        		  type: ct.toLowerCase()
	        	}),
	        	{
	        		  [BUFFER]: buffer,
                name: `image`
	        	});
    })
    .then(blob => {
        const { name, size, type } = blob;
        return blob;
    })
    .then(blob => FileRecord.fromBlob(blob, { collection: collections.MediaRecord }));
}

Meteor.methods({
    "acc-text-import/fetchMedia"(productId, variantId, imageUrl){
        check(productId, String);
        check(variantId, String);
        check(imageUrl, String);
        const uploadUrl = process.env.UPLOAD_URL;
        Logger.info(`Fetching image for ${productId}`);
        const fileRecord = Promise.await(fetchImage(imageUrl));
        Logger.info("Attaching metadata");
        fileRecord.metadata = {
            priority: 20,
            productId,
            variantId
        };

        Promise.await(fileRecord.upload({
                chunkSize: 5 * 1024 * 1024,
                endpoint: uploadUrl
        }));

        Logger.info("Done");

        return fileRecord;
    }
});

import { Meteor } from "meteor/meteor";
import fetch from "node-fetch";
import Logger from "@reactioncommerce/logger";

import { FileRecord } from "@reactioncommerce/file-collections";
import decodeOpaqueId from "/imports/utils/decodeOpaqueId.js";
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
    "acc-text-import/fetchMedia"(shopId, productId, variantId, imageUrl, uploadUrl){
        check(productId, String);
        check(variantId, String);
        check(imageUrl, String);
        check(uploadUrl, String);
        Logger.info(`Fetching image for ${productId}`);
        const fileRecord = Promise.await(fetchImage(imageUrl));
        Logger.info("Attaching metadata");
        const { id: decodedShopId } = decodeOpaqueId(shopId);
        const { id: decodedId } = decodeOpaqueId(productId);
        const { id: decodedVariantId } = decodeOpaqueId(variantId);
        fileRecord.metadata = {
            priority: 20,
            shopId: decodedShopId,
            productId: decodedId,
            variantId: decodedVariantId
        };

        Promise.await(fileRecord.upload({
                chunkSize: 5 * 1024 * 1024,
                endpoint: uploadUrl
        }));

        return fileRecord;
    }
});

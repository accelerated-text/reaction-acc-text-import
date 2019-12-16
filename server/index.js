import MediaRecords from "/lib/collections";
import collections from "/imports/collections/rawCollections";
import Logger from "@reactioncommerce/logger";
import Reaction from "/imports/plugins/core/core/server/Reaction";
import { Meteor } from "meteor/meteor";
import { check } from "meteor/check";
import ReactionError from "@reactioncommerce/reaction-error";
import publishProductToCatalogById from "/imports/node-app/core-services/catalog/utils/publishProductsToCatalog";
import getGraphQLContextInMeteorMethod from "/imports/plugins/core/graphql/server/getGraphQLContextInMeteorMethod";
import createHandle from "/imports/plugins/core/catalog/server/methods/catalog";
import decodeOpaqueId from "/imports/utils/decodeOpaqueId.js";
import { AbsoluteUrlMixin } from "/imports/plugins/core/core/server/Reaction/absoluteUrl";
import "./i18n";
import fetch from "node-fetch";
import { Blob, BUFFER, ExFileRecord } from "./utils";

import createMediaRecord from "/imports/node-app/core-services/files/mutations/createMediaRecord.js"
import { MediaRecord } from "/imports/node-app/core-services/files/simpleSchemas.js"
import appEvents from "/imports/node-app/core/util/appEvents";

global.Blob = Blob

function getContext() {
    const context = {
        ...Promise.await(getGraphQLContextInMeteorMethod(Meteor.userId())),
        collections
    };

    return context;
}

function isMediaLoaded(productId) {
  const { Media } = collections;
  const media = Promise.await(Media.findOne(
    {
      "metadata.productId": productId,
      "metadata.workflow": { $nin: ["archived", "unpublished"] }
    },
  ));

  return media.url({ store: "image" }) != null
}

async function fetchImage(productId, variantId, shopId, imageUrl){
  const fileRecord = await fetch(imageUrl)
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
                                 name: `${data.title}-image`
	        	       })
                           })
                           .then(blob => {
                             const { name, size, type } = blob;
                             Logger.debug(blob);
                             return blob;
                           })
                           .then(blob => ExFileRecord.fromBlob(blob, { collection: collections.MediaRecord }));

          Logger.info("File downloaded");

          const { account, user } = await getGraphQLContextInMeteorMethod(Meteor.userId());

          fileRecord.metadata = {
            shopId: shopId,
            productId: productId,
            variantId: variantId,
            priority: 20
          };

          const uploadResult = await fileRecord.upload({
            chunkSize: 5 * 1024 * 1024,
            endpoint: AbsoluteUrlMixin.absoluteUrl("/assets/uploads")
          });
          Logger.debug(`Upload result: ${uploadResult}`)

          const context = {
            accountId: account._id,
            userId: user._id,
            userHasPermission: (_, shopId) => true,
            appEvents,
            collections
          };

          Logger.info(`Document: ${fileRecord.document}`)

          const input = {
            mediaRecord: fileRecord.document,
            shopId: shopId
          };

          Logger.info("Creating media");

          const result = await createMediaRecord(context, input);
          Logger.info(`Media creation result: ${result}`);

          Logger.info("Waiting for server to build copies...");
          while(!isMediaLoaded(productId)){
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          Logger.info("Done. Media is prepared");
}

Meteor.methods({
    "acc-text-import/products/setupProduct"(_id, shopId, data, desc) {
        check(_id, String);
        check(shopId, String);
        check(data, {
            code: String,
            title: String,
            variantId: String,
            vendor: String,
            imageUrl: String
        });
        check(desc, String);
      
        Logger.info(`Setuping Product: ${_id}`);
        const { id: decodedId } = decodeOpaqueId(_id);
        const { id: decodedVariantId } = decodeOpaqueId(data.variantId);
        const { id: decodedShopId } = decodeOpaqueId(shopId);

        Meteor.call("products/updateProductField", decodedId, "title", data.title);
        Meteor.call("products/updateProductField", decodedId, "isVisible", "true");
        Meteor.call("products/updateProductField", decodedId, "description", desc);
        Meteor.call("products/updateProductField", decodedId, "sku", data.code);
        Meteor.call("products/updateProductField", decodedId, "vendor", data.vendor);
        Meteor.call("products/updateProductField", decodedVariantId, "isVisible", "true");
        Meteor.call("products/updateProductField", decodedVariantId, "attributeLabel", "Base");
        Meteor.call("products/updateProductField", decodedVariantId, "title", "Base");

        // Ignore ImageUrl stuff for now
        if(data.imageUrl){
          try{
            Promise.await(fetchImage(dedocedId, decodedVariantId, decodedShopId, data.imageUrl));
          }
          catch(e){
            Logger.error(`Failed to fetch image for ${decodedId}. Reason: ${e}`);
          }
        }
        else {
          Logger.info("No `imageUrl` is given");
        }

        Promise.await(publishProductToCatalogById([decodedId], getContext()));

        return true;
   }
});


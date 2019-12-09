import { Products } from "/lib/collections";
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
import { FileRecord } from "@reactioncommerce/file-collections";
import "./i18n";
import fetch from "node-fetch";

import { createMediaRecord } from "/imports/node-app/core-services/files/mutations/createMediaRecord"
import { MediaRecord } from "/imports/node-app/core-services/files/simpleSchemas.js"

function getContext() {
    const context = {
        ...Promise.await(getGraphQLContextInMeteorMethod(Meteor.userId())),
        collections
    };

    return context;
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

        if(data.imageUrl){
          const syncFromUrl = Meteor.wrapAsync(FileRecord.fromUrl);
          const fileRecord = syncFromUrl(data.imageUrl, {fetch: fetch});
          fileRecord.upload({});
          const mediaRecord = {
            metadata: {
              productId: decodedId,
              variantId: decodedVariantId
            },
            original: fileRecord.document.original,
            shopId: decodedShopId,
          };

          const context = {
            ...Promise.await(getGraphQLContextInMeteorMethod(Meteor.userId())),
            collections: { MediaRecords }
          };
          const input = {
            mediaRecord: mediaRecord,
            shopId: decodedShopId,
          };

          const syncCreate = Meteor.wrapAsync(createMediaRecord);
          const result = syncCreate(context, input);
          Logger.info(`Media creation result: ${result}`);
        }

        publishProductToCatalogById([decodedId], getContext());

        return true;
   }
});


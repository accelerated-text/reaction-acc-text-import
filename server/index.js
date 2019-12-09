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
import "./i18n";

function getContext() {
    const context = {
        ...Promise.await(getGraphQLContextInMeteorMethod(Meteor.userId())),
        collections
    };

    return context;
}

Meteor.methods({
    "acc-text-import/products/setupProduct"(_id, data, desc) {
        check(_id, String);
        check(data, {
            code: String,
            title: String,
            variantId: String,
            vendor: String,
        });
        check(desc, String);
        const { id: decodedId } = decodeOpaqueId(_id);
        const { id: decodedVariantId } = decodeOpaqueId(data.variantId);

        Meteor.call("products/updateProductField", decodedId, "title", data.title);
        Meteor.call("products/updateProductField", decodedId, "isVisible", "true");
        Meteor.call("products/updateProductField", decodedId, "description", desc);
        Meteor.call("products/updateProductField", decodedId, "sku", data.code);
        Meteor.call("products/updateProductField", decodedId, "vendor", data.vendor);
        Meteor.call("products/updateProductField", decodedVariantId, "isVisible", "true");
        Meteor.call("products/updateProductField", decodedVariantId, "attributeLabel", "Base");
        Meteor.call("products/updateProductField", decodedVariantId, "title", "Base");

        publishProductToCatalogById([decodedId], getContext());

        return true;
   }
});


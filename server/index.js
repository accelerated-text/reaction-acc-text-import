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
            variantId: String
        });
        check(desc, String);
        const { id: decodedId } = decodeOpaqueId(_id);
        const { id: decodedVariantId } = decodeOpaqueId(data.variantId);

        Meteor.call("products/updateProductField", decodedId, "title", data.title);
        Meteor.call("products/updateProductField", decodedId, "isVisible", "true");
        Meteor.call("products/updateProductField", decodedId, "description", desc);
        Meteor.call("products/updateProductField", decodedId, "barcode", code);
        Meteor.call("products/updateProductField", decodedVariantId, "isVisible", "true");
        Meteor.call("products/updateProductField", decodedVariantId, "attributeLabel", "Base");
        Meteor.call("products/updateProductField", decodedVariantId, "title", "Base");

        publishProductToCatalogById([decodedId], getContext());

        return true;
        // const product = Products.findOne({ _id: decodedId });
        // if (!product) {
        //     throw new ReactionError("not-found", `Product id: "${decodedId}" not found`);
        // }

        // const handle = createHandle(Reaction.getSlug(data.title), decodedId);


        // const update = {
        //     "title": data.title,
        //     "isVisible": true,
        //     handle
        // };

        // const result = Products.update({_id: decodedId}, {$set: update}, {selector: "simple"});
   }
});

// export default uploadProducts = (products) => {
//     /*
//       * Single Product example:

//       ```json
//       {
// 	    "_id": "h2v7MYCXBtjMm7Piv",
// 	    "type": "simple",
//       "supportedFulfillmentTypes": ["shipping"],
// 	    "ancestors": [],
// 	    "shopId": "J8Bhq3uTtdgwZx3rz",
// 	    "title": "Reaction Bag of Beans",
// 	    "originCountry": "US",
// 	    "requiresShipping": true,
// 	    "handle": "reaction-bag-of-beans",
// 	    "isDeleted": false,
// 	    "isVisible": true,
// 	    "template": "productDetailSimple",
// 	    "price": {
// 		  "range": "12 - 24",
// 		  "min": 12.00,
// 		  "max": 24.00
// 	    },
// 	    "workflow": {
// 		  "status": "new"
// 	    },
// 	    "isLowQuantity": false,
// 	    "isSoldOut": true,
// 	    "vendor": "Bluestone Coffee",
// 	    "description": "A bag of rich Arabica coffee. Great for a fueling up for a night out or for settling in for a night of coding at home",
// 	    "isBackorder": true,
// 	    "hashtags": [
// 		  "hZdSevCBP8dDc66Ba"
// 	    ]
//       },
//       ```
//       */
//     Logger.info("Starting load Products");
//     products.forEach((product) => {
//         product.createdAt = new Date();
//         product.updatedAt = new Date();
//         Products.insert(product, {}, { publish: true });
//         if (product.type === "simple" && product.isVisible) {
//             publishProductToCatalogById(product._id, getContext());
//         }
//     });
//     Logger.info("Products loaded");
// }

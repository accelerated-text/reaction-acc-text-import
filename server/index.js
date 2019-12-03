import { Products } from "/lib/collections";
import Logger from "@reactioncommerce/logger";
import publishProductToCatalogById from "/imports/plugins/core/catalog/server/no-meteor/utils/publishProductToCatalogById";
import getGraphQLContextInMeteorMethod from "/imports/plugins/core/graphql/server/getGraphQLContextInMeteorMethod";

function getContext() {
    const context = {
        ...Promise.await(getGraphQLContextInMeteorMethod(Meteor.userId())),
        collections
    };

    return context;
}

export default uploadProducts = (products) => {
    /*
      * Single Product example:

      ```json
      {
	    "_id": "h2v7MYCXBtjMm7Piv",
	    "type": "simple",
      "supportedFulfillmentTypes": ["shipping"],
	    "ancestors": [],
	    "shopId": "J8Bhq3uTtdgwZx3rz",
	    "title": "Reaction Bag of Beans",
	    "originCountry": "US",
	    "requiresShipping": true,
	    "handle": "reaction-bag-of-beans",
	    "isDeleted": false,
	    "isVisible": true,
	    "template": "productDetailSimple",
	    "price": {
		  "range": "12 - 24",
		  "min": 12.00,
		  "max": 24.00
	    },
	    "workflow": {
		  "status": "new"
	    },
	    "isLowQuantity": false,
	    "isSoldOut": true,
	    "vendor": "Bluestone Coffee",
	    "description": "A bag of rich Arabica coffee. Great for a fueling up for a night out or for settling in for a night of coding at home",
	    "isBackorder": true,
	    "hashtags": [
		  "hZdSevCBP8dDc66Ba"
	    ]
      },
      ```
      */
    Logger.info("Starting load Products");
    products.forEach((product) => {
        product.createdAt = new Date();
        product.updatedAt = new Date();
        Products.insert(product, {}, { publish: true });
        if (product.type === "simple" && product.isVisible) {
            publishProductToCatalogById(product._id, getContext());
        }
    });
    Logger.info("Products loaded");
}

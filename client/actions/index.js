import { Meteor } from "meteor/meteor";

import CreateProductMutation from "../queries/createProduct.graphql";
import CreateProductVariantMutation from "../queries/createVariant.graphql";
import DocumentPlansQuery from "../queries/documentPlans.graphql";
import { GraphQLClient } from "graphql-request";

export const getDocumentPlans = (options = {accTextGraphQLURL: "http://localhost:3001/_graphql"}) => {
  const { accTextGraphQLURL } = options;
  const graphQLClient = new GraphQLClient(accTextGraphQLURL);
  return graphQLClient.request(DocumentPlansQuery).then(data => data.documentPlans.items);
}

export const buildProduct = async (shopId, productId, data, desc, options = {graphQLURL: "http://localhost:3000/graphql-beta"}) => {
  console.log(`Building product: ${productId}, with data: ${data}, having descriptions: ${desc}`);
  const title = data.title;
  const { graphQLURL } = options;
  const meteorAuth = localStorage.getItem("Meteor.loginToken");

  const graphQLClient = new GraphQLClient(graphQLURL, {
    headers: {
      "meteor-login-token": meteorAuth
    }
  });

  const createProduct = async (input) => {
    const variables = { input };
    return graphQLClient.request(CreateProductMutation, variables);
  };

  const createVariant = async (input) => {
    const variables = { input };
    return graphQLClient.request(CreateProductVariantMutation, variables);
  };

    const product = await createProduct({shopId: shopId}).then(resp => resp.createProduct.product);
    const variant = await createVariant({productId: product._id, shopId: shopId}).then(resp => resp.createProductVariant.variant);
    console.log(`Setuping ProductId: ${product._id}, variantId: ${variant._id}`);
    const description = () => {
      if(desc.length > 0){
        return _.shuffle(desc)[0];
      }
      else{
        return "";
      }
    };

    const productSetup = new Promise((resolve, reject) => {
      Meteor.call("acc-text-import/products/setupProduct",
                               product._id,
                               shopId,
                               {title: data.product,
                                variantId: variant._id,
                                code: productId,
                                vendor: data.maker,
                                imageUrl: data.imageUrl || ""},
                                description(),
                                (error, result) => {
                                  if (error) reject(error);
                                  resolve(result);
                                })
    });
    return await productSetup;
};

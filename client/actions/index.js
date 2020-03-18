import { Meteor } from "meteor/meteor";

import CreateProductMutation from "../queries/createProduct.graphql";
import CreateProductVariantMutation from "../queries/createVariant.graphql";
import DocumentPlansQuery from "../queries/documentPlans.graphql";
import { GraphQLClient } from "graphql-request";

const readResult = async (resultId, options) => {
  const {accTextURL} = options;
  console.log(`Reading data from ${resultId}`);

  while(true){
    result = await fetch(`${accTextURL}/${resultId}?format=raw`, {method: "get"})
      .then(response => response.json())
    if(result.ready){
      return result.variants;
    }
    console.log("NLG result is not ready yet. Retry after second");
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

export const generateDescriptions = async (documentPlanId, dataRows, options = {accTextURL: "http://localhost:3001/nlg"}) => {
  const request = { documentPlanId: documentPlanId, dataRows: dataRows, readerFlagValues: {English: true} };
  const {accTextURL} = options;
  const conf = {
      method: "post",
      body: JSON.stringify(request),
      headers: new Headers({ "Content-Type": "application/json",})
  };

  const result = await fetch(`${accTextURL}/_bulk/`, conf).then(response => response.json());
  return await readResult(result.resultId, options);
}

export const getDocumentPlans = (options = {accTextGraphQLURL: "http://localhost:3001/_graphql"}) => {
  const { accTextGraphQLURL } = options;
  const graphQLClient = new GraphQLClient(accTextGraphQLURL);
  return graphQLClient.request(DocumentPlansQuery).then(data => data.documentPlans.items);
}

export const buildProduct = async (shopId, productId, data, desc, options = {graphQLURL: "http://localhost:3000/graphql"}) => {
  console.log(`Building product: ${productId}, with data: ${data}, having descriptions: ${desc[0].original}`);
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
        return _.shuffle(desc)[0].original;
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

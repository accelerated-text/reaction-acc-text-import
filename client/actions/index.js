import { Meteor } from "meteor/meteor";
import React, { Component } from "react";

import DocumentPlansQuery from "../queries/documentPlans.graphql";
import { GraphQLClient } from "graphql-request";

import createProductMutation from "../queries/createProduct";
import createProductVariantMutation from "../queries/createVariant";
import updateProductMutation from "../queries/updateProduct";
import updateProductVariantMutation from "../queries/updateProductVariant";
import { useApolloClient, useMutation } from "@apollo/react-hooks";


export function withMutations(Component){
    return function WrappedComponent(props) {
        const [createProduct, { error: createProductError }] = useMutation(createProductMutation);
        const [createVariant, { error: createVariantError }] = useMutation(createProductVariantMutation);
        const [updateProduct, { error: updateProductError }] = useMutation(updateProductMutation);
        const [updateProductVariant, { error: updateProductVariantError }] = useMutation(updateProductVariantMutation);
        return <Component
        {...props}
        createProduct={createProduct}
        createVariant={createVariant}
        updateProduct={updateProduct}
        updateProductVariant={updateProductVariant}
            />;
    };
}


const readResult = async (resultId, options) => {
  const {accTextURL} = options;
  console.log(`Reading data from ${resultId}`);

  while(true){
    result = await fetch(`${accTextURL}/${resultId}?format=raw`, {method: "get"})
          .then(response => response.json());
    if(result.ready){
      return result.variants;
    }
    console.log("NLG result is not ready yet. Retry after second");
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};

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
};

export const getDocumentPlans = (options = {accTextGraphQLURL: "http://localhost:3001/_graphql"}) => {
  const { accTextGraphQLURL } = options;
  const graphQLClient = new GraphQLClient(accTextGraphQLURL);
  return graphQLClient.request(DocumentPlansQuery).then(data => data.documentPlans.items);
};

export const buildProduct = async (shopId, productId, data, desc, mutations, options = {}) => {
    console.log(`Building product: ${productId}, with data: ${data}, having descriptions: ${desc[0].original}`);
    const title = data.title;
    const { createProduct, createVariant, updateProduct, updateProductVariant } = mutations;

    const product = await createProduct({ variables: {input: { shopId }}}).then(r => r.data.createProduct).then(resp => resp.product);
    const variant = await createVariant({ variables: {input: {productId: product._id, shopId}}}).then(r => r.data.createProductVariant).then(resp => resp.variant);
    console.log(`Setuping ProductId: ${product._id}, variantId: ${variant._id}`);
    const description = () => {
      if(desc.length > 0){
        return _.shuffle(desc)[0].original;
      }
      else{
        return "";
      }
    };

    const productFields = {
        description: description(),
        facebookMsg: "",
        googleplusMsg: "",
        isDeleted: false,
        isVisible: true,
        metaDescription: "",
        metafields: [],
        originCountry: "",
        pageTitle: "",
        pinterestMsg: "",
        productType: "",
        shouldAppearInSitemap: true,
        slug: "",
        supportedFulfillmentTypes: [],
        tagIds: [],
        title: data.product,
        twitterMsg: "",
        vendor: data.maker,
    };

    const variantFields = {
        attributeLabel: "Base",
        barcode: "",
        height: 0,
        weight: 0,
        width: 0,
        length: 0,
        price: 0,
        index: 0,
        isDeleted: false,
        isVisible: true,
        metafields: [],
        minOrderQuantity: 0,
        optionTitle: "",
        originCountry: "",
        sku: data.code,
        title: "Base",
        isTaxable: false,
        taxCode: "",
        taxDescription: ""
    };

    await updateProduct({ variables: {input: {shopId, productId: product._id, product: productFields}}});
    await updateProductVariant({ variables: {input: {shopId, variantId: variant._id, variant: variantFields}}});

    // const productSetup = new Promise((resolve, reject) => {
    //   Meteor.call("acc-text-import/products/setupProduct", product._id,
    //   shopId, {title: data.product, variantId: variant._id, code: productId,
    //   vendor: data.maker, imageUrl: data.imageUrl || ""}, description(),
    //   (error, result) => { if (error) reject(error); resolve(result); }); });
    //   return await productSetup;

    return true;
};

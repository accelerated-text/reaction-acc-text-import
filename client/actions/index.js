import { Meteor } from "meteor/meteor";
import React, { Component } from "react";

import DocumentPlansQuery from "../queries/documentPlans.graphql";
import { GraphQLClient } from "graphql-request";
import useAuth from "/imports/client/ui/hooks/useAuth";

import createProductMutation from "../queries/createProduct";
import createProductVariantMutation from "../queries/createVariant";
import updateProductMutation from "../queries/updateProduct";
import updateProductVariantMutation from "../queries/updateProductVariant";
import createMediaRecordMutation from "../queries/createMediaRecord";
import findProductQuery from "../queries/findProduct";

import { useApolloClient, useMutation, useLazyQuery } from "@apollo/react-hooks";

export function withMutations(Component){
    return function WrappedComponent(props) {
        const [createProduct, { error: createProductError }] = useMutation(createProductMutation);
        const [createVariant, { error: createVariantError }] = useMutation(createProductVariantMutation);
        const [updateProduct, { error: updateProductError }] = useMutation(updateProductMutation);
        const [updateProductVariant, { error: updateProductVariantError }] = useMutation(updateProductVariantMutation);
        const [createMediaRecord, { error: createMediaRecordError }] = useMutation(createMediaRecordMutation);
        const { isViewerLoading, viewer } = useAuth();

        const apollo = useApolloClient();

        const findProduct = async (input) => {
            const { data, error } =  await apollo.query({...input, query: findProductQuery});
            return data;
        };

        return <Component
        {...props}
        createProduct={createProduct}
        createVariant={createVariant}
        updateProduct={updateProduct}
        updateProductVariant={updateProductVariant}
        createMediaRecord={createMediaRecord}
        findProduct={findProduct}
        viewer={viewer}
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
        return {id: resultId, variants: result.variants};
    }
    console.log("NLG result is not ready yet. Retry after second");
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};

export const generateDescriptions = async (documentPlanId, dataRows, lang, viewer, options = {accTextURL: "http://localhost:3001/nlg"}) => {
    console.log(viewer);
    let readerFlagValues = {};
    readerFlagValues[lang.substring(0, 3)] = true;
    if(viewer !== undefined) {
        readerFlagValues["Lc"] = true;
    }
    else {
        readerFlagValues["Nc"] = true;
    }
    const request = { documentPlanId: documentPlanId, dataRows: dataRows, readerFlagValues };
    const {accTextURL} = options;
    const conf = {
        method: "post",
        body: JSON.stringify(request),
        headers: new Headers({ "Content-Type": "application/json",})
    };
    const result = await fetch(`${accTextURL}/_bulk/`, conf).then(response => response.json());
    return await Promise.all(result.resultIds.map(id => readResult(id, options)));
};

export const getDocumentPlans = (options = {accTextGraphQLURL: "http://localhost:3001/_graphql"}) => {
  const { accTextGraphQLURL } = options;
  const graphQLClient = new GraphQLClient(accTextGraphQLURL);
  return graphQLClient.request(DocumentPlansQuery).then(data => data.documentPlans.items);
};

export const attachImage = async (shopId, productId, variantId, imageUrl, mutations, options = {}) => {
    console.log(`Attaching image to product ${productId}`);
    const { createMediaRecord } = mutations;
    const imageUpload = new Promise((resolve, reject) => {
        Meteor.call("acc-text-import/fetchMedia", productId, variantId, imageUrl, (error, result) => {
            if (error)
                reject(error);
            else
                resolve(result);
        });
    });

    await imageUpload.then(fileRecord => {
        const clientMutationId = productId;

        return createMediaRecord({ variables: {input: {shopId, clientMutationId, mediaRecord: fileRecord.document}}});
    });



    return true;
};

export const buildProduct = async (shopId, data, desc, mutations, options = {}) => {
    console.log(`Building product  with data: ${JSON.stringify(data)}, having descriptions: ${desc[0].original}`);

    const title = data.title;
    const { createProduct, createVariant, updateProduct, updateProductVariant, createMediaRecord, findProduct } = mutations;
    const results = await findProduct({ variables: {code: data.productId, shopId}});
    const matchingProducts = results.products.nodes;
    const getProduct = async () => {
        if(matchingProducts.length > 0){
            console.log("Updating existing product");
            return matchingProducts[0];
        }
        else {
            return await createProduct({ variables: {input: { shopId }}}).then(r => r.data.createProduct).then(resp => resp.product);
        }
    };

    const product = await getProduct();

    //const variant = await createVariant({ variables: {input: {productId: product._id, shopId}}}).then(r => r.data.createProductVariant).then(resp => resp.variant);
    const variant = product.variants[0];
    console.log(`Setuping ProductId: ${product._id}, variantId: ${variant._id}`);
    const description = () => {
      if(desc.length > 0){
        return _.shuffle(desc)[0].original;
      }
      else{
        return "";
      }
    };

    const productMeta = {key: "productCode", value: data.productId};

    const productFields = {
        description: description(),
        facebookMsg: "",
        googleplusMsg: "",
        isDeleted: false,
        isVisible: true,
        metaDescription: "",
        metafields: [productMeta],
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

    console.log("Updating product fields");
    await updateProduct({ variables: {input: {shopId, productId: product._id, product: productFields}}});
    console.log("Updating variant fields");
    await updateProductVariant({ variables: {input: {shopId, variantId: variant._id, variant: variantFields}}});
    return {shopId, productId: product._id, variantId: variant._id, imageUrl: (data.imageUrl || ""), productName: data.product};
};

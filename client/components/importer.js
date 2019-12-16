import React, { Component } from "react";
import { Meteor } from "meteor/meteor";
import { MeteorPromise } from 'meteor/promise';
import { Reaction, i18next } from "/client/api";
import { compose } from "recompose";

import { registerComponent, Components } from "/imports/plugins/core/components/lib/components";

import { withApollo } from "react-apollo";
import { withRouter } from "react-router";
import withOpaqueShopId from "/imports/plugins/core/graphql/lib/hocs/withOpaqueShopId";

import getOpaqueIds from "/imports/plugins/core/core/client/util/getOpaqueIds";

import PropTypes from "prop-types";

import CreateProductMutation from "../queries/createProduct.graphql";
import CreateProductVariantMutation from "../queries/createVariant.graphql";
import DocumentPlansQuery from "../queries/documentPlans.graphql";


import ReactFileReader from "react-file-reader";
import Papa from "papaparse";
import { GraphQLClient } from "graphql-request";


const buildProduct = async (shopId, productId, data, desc) => {
  console.log(`Building product: ${productId}, with data: ${data}, having descriptions: ${desc}`);
  const title = data.title;
  const endpoint = "http://localhost:3000/graphql-beta";
  const meteorAuth = localStorage.getItem("Meteor.loginToken");

  const graphQLClient = new GraphQLClient(endpoint, {
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
                               {title: data.title,
                                variantId: variant._id,
                                code: productId,
                                vendor: data.author,
                                imageUrl: data.imageUrl || ""},
                                description(),
                                (error, result) => {
                                  if (error) reject(error);
                                  resolve(result);
                                })
    });
    return await productSetup;
};

class DocumentPlanSelect extends Component {
  constructor(props){
    super(props);
    this.accTextGQ = "http://localhost:3001/_graphql";
    this.state = {documentPlans: []};
    const graphQLClient = new GraphQLClient(this.accTextGQ);

    graphQLClient.request(DocumentPlansQuery)
      .then(data => {
        this.state.documentPlans = data.documentPlans.items;
        if(this.state.documentPlans.length > 0){
          this.props.onSelect({target: {name: "documentPlanId", value: this.state.documentPlans[0].id}});
        }
      });

    this.handleChange = this.handleChange.bind(this);
  }

  handleChange = e => {
    this.props.onSelect(e);
  }

  documentPlansSelect = () => {
    return this.state.documentPlans.map(e => <option key={e.id} value={e.id}>{e.name}</option>);
  }

  render() {
    return (
              <select
                name="documentPlanId"
                onChange={this.handleChange}>
                {this.documentPlansSelect()}
              </select>
    );
  };
}

class Importer extends Component {
  static propTypes = {
    client: PropTypes.object,
    history: PropTypes.shape({
      push: PropTypes.func.isRequired
    }),
    shopId: PropTypes.string.isRequired
  }

  constructor(props) {
    super(props);
    this.state = {documentPlanId: null, data: {}, rowCount: 0, rowsSuccess: 0, rowsError: 0, documentPlans: []};
    this.accTextUrl = "http://localhost:3001/nlg";
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange = e => {
    this.setState({ [e.target.name]: e.target.value });
    return this.state;
  };

  readResult = resultId => {
    console.log(`Reading data from ${resultId}`);
    fetch(`${this.accTextUrl}/${resultId}?format=raw`, {method: "get"})
      .then(response => response.json())
      .catch(err => this.setState({rowsError: this.state.rowsError + 1}))
      .then(body => {
            if(body.ready){
              Object.entries(body.variants).forEach(([k, v]) => {
                buildProduct(this.props.shopId, k, this.state.dataRows[k], v)
                  .then(result => {
                    if(result){
                      this.setState({rowsSuccess: this.state.rowsSuccess + 1});
                    }
                    else{
                      this.setState({rowsError: this.state.rowsError + 1});
                    }
                  });
              });
            }
            else{
              console.log("NLG result is not ready yet. Retry after second")
              setTimeout(() => {
                this.readResult(resultId);
              }, 1000);
            }
      });
    
  };

  handleFiles = files => {
    var reader = new FileReader();
    var self = this;
    reader.onload = e => {
      const csv = Papa.parse(reader.result, { header: true, skipEmptyLines: true, delimiter: ","});
      this.setState({ data: csv.data, rowCount: csv.data.length });
    }
    reader.readAsText(files[0]);
  };

  handleSubmit = e => {
    e.preventDefault();
    const { data, documentPlanId } = this.state;
    const dataRows = data.reduce((obj, item) => {
      obj[item.productId] = item;
      return obj;
    }, {});

    this.state.dataRows = dataRows;
    const request = { documentPlanId: documentPlanId, dataRows: dataRows, readerFlagValues: {} };
    this.setState({rowsSuccess: 0, rowsError: 0});
    const conf = {
      method: "post",
      body: JSON.stringify(request),
      headers: new Headers({ "Content-Type": "application/json",})
    };
    
    fetch(`${this.accTextUrl}/_bulk/`, conf)
       .then(response => response.json())
       .then(result => this.readResult(result.resultId));
  };
  
  render(){
    return (<div>
            <h1>{i18next.t("admin.settings.accImportLabel")}</h1>
            <div>
            <ReactFileReader handleFiles={this.handleFiles}>
            <button className='btn'>{i18next.t("admin.settings.uploadCSV")}</button>
            </ReactFileReader>
            </div>
            <span>{i18next.t("admin.settings.rowsLoaded")}: {this.state.rowCount}</span>
            <form onSubmit={this.handleSubmit}>
            <div>
              <label>{i18next.t("admin.settings.descriptionType")}</label>
              <DocumentPlanSelect
                onSelect={this.handleChange}/>
            </div>
            <div>
            <button disabled={this.state.rowCount == 0}>{i18next.t("admin.settings.importProducts")}</button>
            </div>
            </form>
            <div>
              <span>{this.state.rowsSuccess} {i18next.t("admin.settings.productsImported")}</span>
              / 
              <span>{this.state.rowsError} {i18next.t("admin.settings.productsFailed")}</span>
              / 
              <span>{this.state.rowCount} {i18next.t("admin.settings.productsTotal")}</span>
            </div>
            </div>);
  }
}


registerComponent("Importer", Importer, [
  withApollo,
  withRouter,
  withOpaqueShopId
]);

export default compose(
  withApollo,
  withRouter,
  withOpaqueShopId
)(Importer);

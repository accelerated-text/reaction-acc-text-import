import React, { Component } from "react";
import { Meteor } from "meteor/meteor";
import { Reaction } from "/client/api";
import { compose } from "recompose";

import { registerComponent, Components } from "/imports/plugins/core/components/lib/components";

import { withApollo } from "react-apollo";
import { withRouter } from "react-router";
import withOpaqueShopId from "/imports/plugins/core/graphql/lib/hocs/withOpaqueShopId";

import PropTypes from "prop-types";

// import getOpaqueIds from "/imports/plugins/core/core/client/util/getOpaqueIds";
import CreateProductMutation from "../queries/createProduct.graphql";
import PublishProductMutation from "../queries/publishProduct.graphql";
import CreateProductVariantMutation from "../queries/createVariant.graphql";



import ReactFileReader from "react-file-reader";
import Papa from "papaparse";
import { GraphQLClient } from "graphql-request";

const dpQuery = `{
  documentPlans{
    items{id name}
  }
}`

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

  const publishProduct = async (productId) => {
    const variables = { productId };
    return graphQLClient.request(PublishProductMutation, variables);
  };
  
  // const [shopId] = await getOpaqueIds([{ namespace: "Shop", id: Reaction.getShopId() }]);
  const product = await createProduct({shopId: shopId}).then(resp => resp.createProduct.product);
  const variant = await createVariant({productId: product._id, shopId: shopId});
  console.log(variant);
  publishProduct(product._id).then(result => console.log(result));
};

class DocumentPlanSelect extends Component {
  constructor(props){
    super(props);
    this.accTextGQ = "http://localhost:3001/_graphql";
    this.state = {documentPlans: []};
    const graphQLClient = new GraphQLClient(this.accTextGQ);

    graphQLClient.request(dpQuery)
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
    this.state = {documentPlanId: null, data: {}, rowCount: 0, documentPlans: []};
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
      .then(body => {
            if(body.ready){
              Object.entries(body.variants).forEach(([k, v]) => {
                buildProduct(this.props.shopId, k, this.state.dataRows[k], v);
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
            <h1>Accelerated Text Import</h1>
            <div>
            <ReactFileReader handleFiles={this.handleFiles}>
              <button className='btn'>Upload Product CSV</button>
            </ReactFileReader>
            </div>
            <span>Rows loaded: {this.state.rowCount}</span>
            <form onSubmit={this.handleSubmit}>
            <div>
              <label>Description Type</label>
              <DocumentPlanSelect
                onSelect={this.handleChange}/>
            </div>
            <div>
              <button disabled={this.state.rowCount == 0}>Import products</button>
            </div>
            </form>
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

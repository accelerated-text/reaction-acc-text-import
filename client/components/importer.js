import React, { Component } from "react";
import { Reaction, i18next } from "/client/api";
import { compose } from "recompose";

import { registerComponent, Components } from "/imports/plugins/core/components/lib/components";

import { withApollo } from "react-apollo";
import { withRouter } from "react-router";
import withOpaqueShopId from "/imports/plugins/core/graphql/lib/hocs/withOpaqueShopId";

import PropTypes from "prop-types";

import ReactFileReader from "react-file-reader";
import Papa from "papaparse";

import { buildProduct, getDocumentPlans, generateDescriptions, withMutations, attachImage } from "../actions";

class DocumentPlanSelect extends Component {
  constructor(props){
    super(props);
    this.state = {documentPlans: []};

    getDocumentPlans()
      .then(documentPlans => {
        this.state.documentPlans = documentPlans;
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
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange = e => {
    this.setState({ [e.target.name]: e.target.value });
    return this.state;
  };

  handleFiles = files => {
    var reader = new FileReader();
    var self = this;
    reader.onload = e => {
      const csv = Papa.parse(reader.result, { header: true, skipEmptyLines: true, delimiter: ","});
      this.setState({ data: csv.data, rowCount: csv.data.length });
    };
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
    generateDescriptions(documentPlanId, dataRows)
      .then(variants => {
        Object.entries(variants).forEach(([k, v]) => {
            buildProduct(this.props.shopId, k, this.state.dataRows[k], v, {
                createProduct: this.props.createProduct,
                createVariant: this.props.createVariant,
                updateProduct: this.props.updateProduct,
                updateProductVariant: this.props.updateProductVariant
            })
                .then(result => {
                    const { shopId, productId, variantId, imageUrl, productName } = result;
                    if(imageUrl != ""){
                        return attachImage(shopId, productId, variantId, imageUrl, {createMediaRecord: this.props.createMediaRecord});
                    }
                    else {
                        return true;
                    }
                })
                .then(result => {
                    if(result){
                        this.setState({rowsSuccess: this.state.rowsSuccess + 1});
                    }
                    else{
                        this.setState({rowsError: this.state.rowsError + 1});
                    }
                });
        });
      });
  };

  render(){
    return (<div>
            <h1>{i18next.t("admin.settings.accImportLabel")}</h1>
            <div>
            <ReactFileReader fileTypes={["*.csv"]} handleFiles={this.handleFiles}>
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
    withOpaqueShopId,
    withMutations
]);

export default compose(
    withApollo,
    withRouter,
    withOpaqueShopId,
    withMutations
)(Importer);

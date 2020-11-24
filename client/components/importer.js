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

import { buildProduct, generateDescriptions, withMutations, attachImage } from "../actions";
import { LanguageSelect } from "./languageSelect";
import { DocumentPlanSelect } from "./documentPlanSelect";
import { Logo } from "./logo";

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
        this.state = {
            documentPlanId: null,
            data: {},
            rowCount: 0,
            rowsSuccess: 0,
            rowsError: 0,
            documentPlans: [],
            selectedLang: "English",
        };
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
        const { data, documentPlanId, selectedLang } = this.state;
        if(Object.entries(data).length === 0) {
            return;
        }
        const dataRows = data.reduce((obj, item) => {
            obj[item.productId] = item;
            return obj;
        }, {});

        this.state.dataRows = dataRows;
        generateDescriptions(documentPlanId, dataRows, selectedLang, this.props.viewer)
            .then(results => {
                console.log(results);
                results.map(result => {
                    return buildProduct(this.props.shopId, this.state.dataRows[result.id], result.variants, {
                        createProduct: this.props.createProduct,
                        createVariant: this.props.createVariant,
                        updateProduct: this.props.updateProduct,
                        updateProductVariant: this.props.updateProductVariant,
                        findProduct: this.props.findProduct
                    });
                })
                .map(r => {
                    const { shopId, productId, variantId, imageUrl } = r;
                    if(imageUrl != "" && imageUrl !== undefined){
                        return attachImage(shopId, productId, variantId, imageUrl, {createMediaRecord: this.props.createMediaRecord});
                    }
                    else {
                        return true;
                    }
                })
               .map(r => {
                   if(r){
                       this.setState({rowsSuccess: this.state.rowsSuccess + 1});
                   }
                   else{
                       this.setState({rowsError: this.state.rowsError + 1});
                   }
               });
             });
    };

    render(){
        return (<div>
                <Logo></Logo>
                <form onSubmit={this.handleSubmit}>
                <div className="MuiPaper-root MuiCard-root MuiPaper-elevation1 MuiPaper-rounded">
                <h2>Import Tool</h2>
                <ol className="MuiCardContent-root">
                <li>
                <ReactFileReader fileTypes={["*.csv"]} handleFiles={this.handleFiles}>
                <button className='btn'>{i18next.t("admin.settings.uploadCSV")}</button>
                </ReactFileReader>
                <span>{i18next.t("admin.settings.rowsLoaded")}: {this.state.rowCount}</span>
                </li>

                <li>

                <div>
                <label>{i18next.t("admin.settings.descriptionType")}</label>
                <DocumentPlanSelect onSelect={this.handleChange}/>
                </div>
                <div>
                <label>{i18next.t("admin.settings.language")}</label>
                <LanguageSelect onSelect={this.handleChange}/>
                </div>
                </li>

                <li>
                <div>
                <button disabled={this.state.rowCount == 0}>{i18next.t("admin.settings.importProducts")}</button>

                </div>
                <span>{this.state.rowsSuccess} {i18next.t("admin.settings.productsImported")}</span>
                /
                <span>{this.state.rowsError} {i18next.t("admin.settings.productsFailed")}</span>
                /
                <span>{this.state.rowCount} {i18next.t("admin.settings.productsTotal")}</span>
                </li>
                </ol>
                </div>
                </form>
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

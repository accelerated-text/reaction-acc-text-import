import React, { Component } from "react";
import { Meteor } from "meteor/meteor";
import { Button, SettingsCard } from "/imports/plugins/core/ui/client/components";

import ReactFileReader from "react-file-reader";
import Papa from "papaparse";
import { request as gql } from "graphql-request";

const dpQuery = `{
  documentPlans{
    items{id name}
  }
}`

const buildProduct = (productId, data, desc) => {
  console.log(`Building product: ${productId}, with data: ${data}, having descriptions: ${desc}`);
};

class DocumentPlanSelect extends Component {
  constructor(props){
    super(props);
    this.accTextGQ = "http://localhost:3001/_graphql";
    this.state = {documentPlans: []};

    gql(this.accTextGQ, dpQuery)
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
    return this.state.documentPlans.map(e => <option value={e.id}>{e.name}</option>);
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
                buildProduct(k, this.state.dataRows[k], v);
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

export default Importer;

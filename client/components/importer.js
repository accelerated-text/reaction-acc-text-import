import React, { Component } from "react";
import { Meteor } from "meteor/meteor";
import { Button, SettingsCard } from "/imports/plugins/core/ui/client/components";

import ReactFileReader from "react-file-reader";

const documentPlans = [{title: "Books", id: "d24711ba-0c13-4792-a8cb-61141e85778b"}]

class Importer extends Component {

  constructor(props) {
    super(props);
    this.state = {documentPlanId: documentPlans[0].id, data: {}};
    this.accTextUrl = "http://localhost:3001/nlg";
    
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange = e => {
    this.setState({ [e.target.name]: e.target.value });
    return this.state;
  };

  documentPlansSelect = () => {
    return documentPlans.map(e => <option value={e.id}>{e.title}</option>);
  }

  readResult = resultId => {
    console.log(`Reading data from ${resultId}`);
    fetch(`${this.accTextUrl}/${resultId}`, {method: "get"})
      .then(response => response.json())
      .then(body => {
            if(body.ready){
              console.log(body);
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
    reader.onload = function(e) {
      // Use reader.result
      console.log(reader.result)
    }
    reader.readAsText(files[0]);
  };

  handleSubmit = e => {
    e.preventDefault();
    const { data, documentPlanId } = this.state;
    const rows = {testProduct: {title: "Misery", author: "Stephen King"}};
    const request = { documentPlanId: documentPlanId, dataRows: rows, readerFlagValues: {} };
    console.log(request);
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
            <form onSubmit={this.handleSubmit}>
            <div>
            <ReactFileReader handleFiles={this.handleFiles}>
              <button className='btn'>Upload Product CSV</button>
            </ReactFileReader>
            </div>
            <div>
              <label>Description Type</label>
              <select
                name="documentPlanId"
                onChange={this.handleChange}>
                {this.documentPlansSelect()}
              </select>
            </div>
            <div>
              <button>Import products</button>
            </div>
            </form>
            </div>);
  }
}

export default Importer;

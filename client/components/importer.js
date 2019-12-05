import React, { Component } from "react";
import { Meteor } from "meteor/meteor";
import { Button, SettingsCard } from "/imports/plugins/core/ui/client/components";

class Importer extends Component {

  constructor(props) {
    super(props);
    this.state = {descriptionType: "books"};
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

  handleSubmit = e => {
    e.preventDefault();
    const { data, descriptionType } = this.state;
    const rows = {testProduct: {title: "Misery", author: "Stephen King"}};
    const request = { documentPlanId: "1d1f6f14-fb26-4ebb-83f2-26e4b2e00a0b", dataRows: rows, readerFlagValues: {} };
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
              <label>Input CSV</label>
              <input
                type="file"
                name="data"
                onChange={this.handleChange}/>
            </div>
            <div>
              <label>Description Type</label>
              <select
                name="descriptionType"
                onChange={this.handleChange}>
                <option value="books">Books</option>
                <option value="food">Food</option>
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

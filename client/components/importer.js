import React, { Component } from "react";
import { Meteor } from "meteor/meteor";
import { Button, SettingsCard } from "/imports/plugins/core/ui/client/components";

class Importer extends Component {

  constructor(props) {
    super(props);
    this.state = {descriptionType: "books"};
    this.accTextUrl = "http://localhost:3000/nlg/";
    
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange = e => {
    this.setState({ [e.target.name]: e.target.value });
    return this.state;
  };

  handleSubmit = e => {
    e.preventDefault();
    const { data, descriptionType } = this.state;
    const request = { documentPlanId: descriptionType, dataId: "" };
    console.log(request);
    const conf = {
      method: "post",
      body: JSON.stringify(request),
      headers: new Headers({ "Content-Type": "application/json",})
    };
    
    fetch(this.accTextUrl, conf)
       .then(response => response.json())
       .then(result => console.log(result));
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

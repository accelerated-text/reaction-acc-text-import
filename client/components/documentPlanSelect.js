import React, { Component } from "react";

import { getDocumentPlans} from "../actions";


export class DocumentPlanSelect extends Component {
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

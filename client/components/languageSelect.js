import React, { Component } from "react";

export class LanguageSelect extends Component {
    constructor(props){
        super(props);
        this.state = {languages: ["English", "Russian", "Spanish", "German"]};
        this.handleChange = this.handleChange.bind(this);
    }
    handleChange = e => {
        this.props.onSelect(e);
    }

    langSelect = () => {
        return this.state.languages.map(e => <option key={e} value={e}>{e}</option>);
    }

    render() {
        return (<select
                name="selectedLang"
                onChange={this.handleChange}>
                {this.langSelect()}
                </select>);
    }
}

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFont } from "@fortawesome/free-solid-svg-icons";
import React from "react";
import { registerOperatorRoute } from "../../../../client/ui";
import Importer from "./components/importer";
import { i18next } from "/client/api";

registerOperatorRoute({
    group: "settings",
    path: "/acc-text-import",
    MainComponent: Importer,
    priority: 20,
    SidebarIconComponent: (props) => <FontAwesomeIcon icon={faFont} {...props} />,
    sidebarI18nLabel: "admin.navigation.accTextImportLabel"
});

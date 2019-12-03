import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLaptop } from "@fortawesome/free-solid-svg-icons";
import React from "react";
import { registerOperatorRoute } from "../../../../client/ui";
import Importer from "./components/importer";

registerOperatorRoute({
    isNavigationLink: true,
    isSetting: true,
    path: "/acc-text-import",
    mainComponent: Importer,
    // eslint-disable-next-line react/display-name, react/no-multi-comp
    SidebarIconComponent: (props) => <FontAwesomeIcon icon={faLaptop} {...props} />,
    sidebarI18nLabel: "admin.settings.devToolsLabel"
});

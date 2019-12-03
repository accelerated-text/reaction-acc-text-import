
import { Reaction } from "/lib/api";

// Register package as ReactionCommerce package
Reaction.registerPackage({
    label: "Accelerated Text Import",
    name: "reaction-acc-text-import",
    icon: "fa fa-font",
    version: "1.0.0",
    meta: {
        version: "1.0.0"
    },
    autoEnable: true,
    registry: [
        {
            name: "reaction-acc-text-import",
            label: "Accelerated Text Import",
            provides: ["settings"],
            container: "dashboard",
            template: "Importer",
            icon: "fa fa-font"
        }
    ]
});

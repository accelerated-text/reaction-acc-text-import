
import { Reaction } from "/lib/api";
import register from "./index.js";

Reaction.whenAppInstanceReady(register);


// Register package as ReactionCommerce package
// Reaction.registerPackage({
//     label: "Accelerated Text Import",
//     name: "reaction-acc-text-import",
//     icon: "fa fa-font",
//     version: "1.0.0",
//     meta: {
//         version: "1.0.0"
//     },
//     autoEnable: true,
//     registry: [
//         {
//             name: "reaction-acc-text-import",
//             label: "Accelerated Text Import",
//             provides: ["settings"],
//             container: "dashboard",
//             icon: "fa fa-font"
//         }
//     ]
// });

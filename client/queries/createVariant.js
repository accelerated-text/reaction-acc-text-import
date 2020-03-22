import gql from "graphql-tag";

export default gql`
mutation createProductVariant($input: CreateProductVariantInput!) {
    createProductVariant(input: $input) {
        variant {
            _id
            isVisible
            isDeleted
            optionTitle
            title
        }
    }
}`

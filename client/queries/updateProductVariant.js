import gql from "graphql-tag";

export default gql`
  mutation updateProductVariant($input: UpdateProductVariantInput!) {
    updateProductVariant(input: $input) {
      clientMutationId
    }
  }
`;

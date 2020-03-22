import gql from "graphql-tag";

export default gql`
  query products($shopId: ID!, $code: String!) {
    products(metafieldKey:"productCode", metafieldValue: $code, shopIds: [$shopId]){
      nodes{
        _id,
        variants{
          _id
        }
      }
    }
  }
`;

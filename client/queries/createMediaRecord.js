import gql from "graphql-tag";

export default gql`
  mutation createMediaRecord($input: CreateMediaRecordInput!) {
    createMediaRecord(input: $input) {
      clientMutationId
    }
  }
`;

import gql from "graphql-tag";

export default gql`
  mutation createMediaRecord($input: MediaRecordInput!) {
    createMediaRecord(input: $input) {
      clientMutationId
    }
  }
`;

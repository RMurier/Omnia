import SecretManagement from "./SecretManagement";
import ErrorHandling from "./ErrorHandling";
import LogStructure from "./LogStructure";

export default function BestPracticesIndex() {
  return (
    <>
      <SecretManagement />
      <ErrorHandling />
      <LogStructure />
    </>
  );
}

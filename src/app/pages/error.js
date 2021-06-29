import Error from "next/error";

export default function Page() {
  return (
    <Error
      statusCode={"ヽ(ಠ_ಠ)ノ"}
      title={
        <>
          Something broke. Click <a href="/">here</a> to try again
        </>
      }
    />
  );
}

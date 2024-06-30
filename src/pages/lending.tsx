import Col from "@/components/Col";
import Grid from "@/components/Grid";
import PageLayout from "@/components/PageLayout";

export default function Lending() {

  return (
    <PageLayout
      contentButtonPaddingShorter
      metaTitle="Lending - Pepedex"
    >
      <Header />
    </PageLayout>
  )
}

function Header() {
  return (
    <Col>
      <Grid className="flex justify-center items-center pb-8 pt-8 mt-4">
        <div className="text-3xl font-semibold justify-center text-color">Coming Soon</div>
      </Grid>
    </Col>
  )
}
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import { Link } from "react-router-dom";

function Home() {
  return (
    <>
        <Container>
                  <h3>
                    Welcome to the Australian High Commission, Bangladesh
                  </h3>
                  <p>
                    Welcome to the website of the Australian High Commission in Bangladesh.

Australia was among the first countries in the world to recognise Bangladesh after it achieved independence in 1971. We are old friends, sharing Commonwealth ties, democratic traditions and people-to-people links.

Australia welcomes the continuing growth of its relationship with Bangladesh. Our two-way trade now stands at around $4bn, reflecting Bangladesh’s significant economic growth and our highly complementary commercial strengths.

Australia runs a significant development assistance programme in Bangladesh. Our focus is on education and building economic resilience with a strong focus on women's empowerment and gender equality.

On our website you will find information about Australia’s foreign policy and development programs; trade and investment; visas and immigration; education in Australia; and answers to frequently asked questions.

The website also has consular advice for Australians in Bangladesh.
                  </p>
        </Container>

    <div style={{backgroundColor:'#e94200',  textAlign:'center', padding:'10px', marginTop:'20px'}}>
            <h1>The Australian High Commission</h1>
            <p>bangladesh Embassy</p>
            <Button as={Link} to="/service" variant="outline-light">Application Us</Button>

            
    </div>


    
<Container>
  <div style={{display:'flex', gap:'10px', flexWrap:'wrap', justifyContent:'center'}}>
    <Card style={{ width: '18rem' }}>

        <img src='1.png'  alt='au'/>
          
    </Card>
    <Card style={{ width: '18rem' }}>

        <img src='2.png'  alt='au'/>
          
    </Card>
    <Card style={{ width: '18rem' }}>

        <img src='3.png'  alt='au'/>
          
    </Card>
    <Card style={{ width: '18rem' }}>

        <img src='4.png'  alt='au'/>
          
    </Card>
    <Card style={{ width: '18rem' }}>

        <img src='5.png'  alt='au'/>
          
    </Card>

  </div>
    </Container>

    </>
  )
}

export default Home

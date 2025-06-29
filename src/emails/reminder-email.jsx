import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
  render,
} from "@react-email/components";
import * as React from "react";

export const ReminderEmail = ({ lead, user }) => {
  const previewText = `Reminder: Follow up with ${lead.name || 'your lead'}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoContainer}>
            <Text style={h1}>FormTrack</Text>
          </Section>
          <Text style={h1}>Lead Follow-Up Reminder</Text>
          <Text style={text}>
            Hello {user.name}, this is a reminder to follow up with the lead:
          </Text>
          <Section style={box}>
            <Text style={text}>
              <strong>Lead Name:</strong> {lead.name || "N/A"}
            </Text>
            <Text style={text}>
              <strong>Email:</strong> {lead.email || "N/A"}
            </Text>
             <Text style={text}>
              <strong>Source:</strong> {lead.source}
            </Text>
            <Text style={text}>
              <strong>Submitted On:</strong> {new Date(lead.submittedAt).toLocaleDateString()}
            </Text>
          </Section>
          <Text style={text}>
            You can view the full details and history for this lead by clicking the button below.
          </Text>
          <Section style={{ textAlign: "center", marginTop: "26px" }}>
            <Button
              style={button}
              href={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/leads`}
            >
              View Lead in Dashboard
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            FormTrack - Automated Reminders
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default ReminderEmail;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  border: "1px solid #f0f0f0",
  borderRadius: "4px",
};

const logoContainer = {
    padding: "0 20px",
};

const box = {
  padding: "0 20px",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const h1 = {
  color: "#1d1c1d",
  fontSize: "32px",
  fontWeight: "700",
  margin: "30px 20px",
  padding: "0",
  lineHeight: "42px",
};

const text = {
  color: "#000",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 20px",
};

const button = {
  backgroundColor: "#000000",
  borderRadius: "4px",
  color: "#fff",
  fontSize: "16px",
  textDecoration: "none",
  textAlign: "center",
  display: "inline-block",
  padding: "12px 20px",
  fontWeight: "bold",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  margin: "0 20px",
}; 
package org.community.booking.plugins;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Properties;

@Service
public class EmailSender {

    private static final Logger logger = LoggerFactory.getLogger(EmailSender.class);

    private String smtpHost;
    private Integer smtpPort;
    private String smtpUser;
    private String smtpAlias;
    private String smtpPassword;
    private String confirmUrl;

    @Autowired
    public EmailSender(Environment env) {
        if (env != null) {
            this.smtpHost = env.getProperty("app.smtp.host");
            String portVal = env.getProperty("app.smtp.port");
            if (portVal != null && !portVal.isBlank()) {
                try {
                    this.smtpPort = Integer.parseInt(portVal.trim());
                } catch (NumberFormatException e) {
                    this.smtpPort = null;
                }
            }
            this.smtpUser = env.getProperty("app.smtp.user");
            this.smtpAlias = env.getProperty("app.smtp.alias");
            this.smtpPassword = env.getProperty("app.smtp.password");
            this.confirmUrl = env.getProperty("app.confirm.url");

            logger.info("EmailSender initialized with host={}, port={}, user={}, alias={}, confirmUrl={}",
                    smtpHost, smtpPort, smtpUser, smtpAlias, confirmUrl);

            boolean userAdd = "true".equalsIgnoreCase(env.getProperty("book.user.add"));
            if (userAdd && isConfigurationMissing()) {
                throw new IllegalStateException("Mail configuration is missing in application.properties");
            }
        }
    }

    public EmailSender(String smtpHost, Integer smtpPort, String smtpUser, String smtpPassword, String confirmUrl) {
        this(smtpHost, smtpPort, smtpUser, null, smtpPassword, confirmUrl);
    }

    public EmailSender(String smtpHost, Integer smtpPort, String smtpUser, String smtpAlias, String smtpPassword, String confirmUrl) {
        this.smtpHost = smtpHost;
        this.smtpPort = smtpPort;
        this.smtpUser = smtpUser;
        this.smtpAlias = smtpAlias;
        this.smtpPassword = smtpPassword;
        this.confirmUrl = confirmUrl;
    }

    public boolean isConfigurationMissing() {
        return smtpHost == null || smtpHost.isBlank()
                || smtpPort == null || smtpPort <= 0
                || smtpUser == null || smtpUser.isBlank() || smtpUser.startsWith("<")
                || smtpPassword == null || smtpPassword.isBlank() || smtpPassword.startsWith("<") 
                || confirmUrl == null || confirmUrl.isBlank();
    }

    public boolean sendVerificationEmail(String toEmail, String code) {
        logger.info("sendVerificationEmail called for recipient: {}", toEmail);
        if (isConfigurationMissing()) {
            logger.warn("Cannot send email to {}: SMTP configuration is missing or incomplete (host={}, port={}, user={})",
                    toEmail, smtpHost, smtpPort, smtpUser);
            return false;
        }

        try {
            String fromSender = (smtpAlias != null && !smtpAlias.isBlank()) ? smtpAlias : smtpUser;
            logger.info("Preparing and sending verification email to: {} via SMTP {}:{} (from: {})",
                    toEmail, smtpHost, smtpPort, fromSender);
            JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
            mailSender.setHost(smtpHost);
            mailSender.setPort(smtpPort);
            mailSender.setUsername(smtpUser);
            mailSender.setPassword(smtpPassword);

            Properties props = mailSender.getJavaMailProperties();
            props.put("mail.transport.protocol", "smtp");
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.starttls.required", "true");
            props.put("mail.debug", "false");

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromSender);
            helper.setTo(toEmail);
            helper.setSubject("Verifiera din registrering - Community Booking");

            String link = confirmUrl + "?email=" + URLEncoder.encode(toEmail, StandardCharsets.UTF_8)
                    + "&code=" + URLEncoder.encode(code, StandardCharsets.UTF_8);

            String textContent = "Hej!\n\n"
                    + "Tack för att du registrerat dig hos Community Booking.\n"
                    + "Klicka på länken nedan för att verifiera ditt konto:\n\n"
                    + link + "\n\n"
                    + "Om du inte har registrerat detta konto kan du bortse från detta meddelande.\n\n"
                    + "Vänliga hälsningar,\nCommunity Booking System";

            String htmlContent = "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;\">"
                    + "<h2 style=\"color: #1e3a8a;\">Community Booking</h2>"
                    + "<p>Hej!</p>"
                    + "<p>Tack för att du registrerat dig hos Community Booking.</p>"
                    + "<p>Klicka på knappen nedan för att verifiera och aktivera ditt konto:</p>"
                    + "<div style=\"margin: 25px 0;\">"
                    + "  <a href=\"" + link + "\" style=\"background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;\">Verifiera konto</a>"
                    + "</div>"
                    + "<p style=\"color: #64748b; font-size: 0.9em;\">Eller kopiera och klistra in följande länk i din webbläsare:<br>"
                    + "<a href=\"" + link + "\" style=\"color: #2563eb;\">" + link + "</a></p>"
                    + "<hr style=\"border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;\" />"
                    + "<p style=\"color: #94a3b8; font-size: 0.8em;\">Om du inte har begärt denna registrering kan du ignorera detta e-postmeddelande.</p>"
                    + "</div>";

            helper.setText(textContent, htmlContent);
            mailSender.send(message);
            logger.info("Verification email successfully sent to: {}", toEmail);
            return true;
        } catch (Exception e) {
            logger.error("Failed to send verification email to {}: {}", toEmail, e.getMessage(), e);
            return false;
        }
    }

    public String getSmtpHost() {
        return smtpHost;
    }

    public Integer getSmtpPort() {
        return smtpPort;
    }

    public String getSmtpUser() {
        return smtpUser;
    }

    public String getSmtpAlias() {
        return smtpAlias;
    }

    public String getSmtpPassword() {
        return smtpPassword;
    }

    public String getConfirmUrl() {
        return confirmUrl;
    }
}

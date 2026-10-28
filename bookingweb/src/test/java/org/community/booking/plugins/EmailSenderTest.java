package org.community.booking.plugins;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.junit.jupiter.api.Assertions.*;

public class EmailSenderTest {

    @Test
    public void testAbortStartupWhenUserAddTrueAndConfigMissing() {
        MockEnvironment env = new MockEnvironment();
        env.setProperty("book.user.add", "true");

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> new EmailSender(env));
        assertEquals("Mail configuration is missing in application.properties", ex.getMessage());
    }

    @Test
    public void testAbortStartupWhenUserAddTrueAndPlaceholderCredentials() {
        MockEnvironment env = new MockEnvironment();
        env.setProperty("book.user.add", "true");
        env.setProperty("app.smtp.host", "smtp.gmail.com");
        env.setProperty("app.smtp.port", "587");
        env.setProperty("app.smtp.user", "<gmail email sender>");
        env.setProperty("app.smtp.password", "<google api key>");
        env.setProperty("app.confirm.url", "http://localhost:8080/confirmuser");

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> new EmailSender(env));
        assertEquals("Mail configuration is missing in application.properties", ex.getMessage());
    }

    @Test
    public void testAbortStartupWhenUserAddTrueAndHostMissing() {
        MockEnvironment env = new MockEnvironment();
        env.setProperty("book.user.add", "true");
        env.setProperty("app.smtp.port", "587");
        env.setProperty("app.smtp.user", "user@example.com");
        env.setProperty("app.smtp.password", "secret");
        env.setProperty("app.confirm.url", "http://localhost:8080/confirmuser");

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> new EmailSender(env));
        assertEquals("Mail configuration is missing in application.properties", ex.getMessage());
    }

    @Test
    public void testAbortStartupWhenUserAddTrueAndConfirmUrlMissing() {
        MockEnvironment env = new MockEnvironment();
        env.setProperty("book.user.add", "true");
        env.setProperty("app.smtp.host", "smtp.gmail.com");
        env.setProperty("app.smtp.port", "587");
        env.setProperty("app.smtp.user", "user@example.com");
        env.setProperty("app.smtp.password", "secret");

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> new EmailSender(env));
        assertEquals("Mail configuration is missing in application.properties", ex.getMessage());
    }

    @Test
    public void testStartupSucceedsWhenUserAddTrueAndFullConfigPresent() {
        MockEnvironment env = new MockEnvironment();
        env.setProperty("book.user.add", "true");
        env.setProperty("app.smtp.host", "smtp.example.com");
        env.setProperty("app.smtp.port", "465");
        env.setProperty("app.smtp.user", "validuser@example.com");
        env.setProperty("app.smtp.password", "validPass123");
        env.setProperty("app.confirm.url", "https://booking.example.com/confirm");

        EmailSender sender = new EmailSender(env);
        assertNotNull(sender);
        assertFalse(sender.isConfigurationMissing());
        assertEquals("smtp.example.com", sender.getSmtpHost());
        assertEquals(465, sender.getSmtpPort());
        assertEquals("validuser@example.com", sender.getSmtpUser());
        assertEquals("validPass123", sender.getSmtpPassword());
        assertEquals("https://booking.example.com/confirm", sender.getConfirmUrl());
    }

    @Test
    public void testStartupSucceedsWhenUserAddFalseAndConfigMissing() {
        MockEnvironment env = new MockEnvironment();
        env.setProperty("book.user.add", "false");

        EmailSender sender = new EmailSender(env);
        assertNotNull(sender);
        assertTrue(sender.isConfigurationMissing());
        // Verify no default values are set
        assertNull(sender.getSmtpHost());
        assertNull(sender.getSmtpPort());
        assertNull(sender.getSmtpUser());
        assertNull(sender.getSmtpPassword());
        assertNull(sender.getConfirmUrl());
    }

    @Test
    public void testStartupSucceedsWhenUserAddNotSetAndConfigMissing() {
        MockEnvironment env = new MockEnvironment();

        EmailSender sender = new EmailSender(env);
        assertNotNull(sender);
        assertTrue(sender.isConfigurationMissing());
        assertNull(sender.getSmtpHost());
        assertNull(sender.getSmtpPort());
        assertNull(sender.getSmtpUser());
        assertNull(sender.getSmtpPassword());
        assertNull(sender.getConfirmUrl());
    }

    @Test
    public void testStartupWithAlias() {
        MockEnvironment env = new MockEnvironment();
        env.setProperty("book.user.add", "true");
        env.setProperty("app.smtp.host", "smtp.gmail.com");
        env.setProperty("app.smtp.port", "587");
        env.setProperty("app.smtp.user", "actualuser@gmail.com");
        env.setProperty("app.smtp.alias", "bokning@forening.se");
        env.setProperty("app.smtp.password", "secret123");
        env.setProperty("app.confirm.url", "http://localhost:8080/api/confirmuser");

        EmailSender sender = new EmailSender(env);
        assertNotNull(sender);
        assertFalse(sender.isConfigurationMissing());
        assertEquals("actualuser@gmail.com", sender.getSmtpUser());
        assertEquals("bokning@forening.se", sender.getSmtpAlias());
    }

    @Test
    public void testConstructorWithAlias() {
        EmailSender sender = new EmailSender("smtp.gmail.com", 587, "user@test.se", "alias@test.se", "pass", "http://test/confirm");
        assertEquals("smtp.gmail.com", sender.getSmtpHost());
        assertEquals(587, sender.getSmtpPort());
        assertEquals("user@test.se", sender.getSmtpUser());
        assertEquals("alias@test.se", sender.getSmtpAlias());
        assertEquals("pass", sender.getSmtpPassword());
        assertEquals("http://test/confirm", sender.getConfirmUrl());
    }
}

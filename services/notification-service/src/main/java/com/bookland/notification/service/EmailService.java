package com.bookland.notification.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    @Value("${spring.mail.username:pbookland2k4@gmail.com}")
    private String fromEmail;

    @Async
    public void sendEmailWithHtmlTemplate(String to, String subject, String templateName, Map<String, Object> templateModel) {
        try {
            Context thymeleafContext = new Context();
            thymeleafContext.setVariables(templateModel);

            String htmlBody = templateEngine.process(templateName, thymeleafContext);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true); // true = isHtml

            mailSender.send(message);
            log.info("HTML Email sent successfully to: {}", to);

        } catch (MessagingException e) {
            log.error("Failed to send HTML email to {}", to, e);
        } catch (Exception e) {
            log.error("Unexpected error sending HTML email to {}", to, e);
        }
    }

    @Async
    public void sendPlainEmail(String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);

            mailSender.send(message);
            log.info("Plain email sent successfully to: {}", to);
        } catch (Exception e) {
            log.error("Failed to send plain email to {}", to, e);
        }
    }
}

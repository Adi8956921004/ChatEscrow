package com.chatescrow.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import java.io.File;
import java.nio.file.Files;
import java.util.List;

@SpringBootApplication
public class ChatEscrowApplication {
    public static void main(String[] args) {
        loadEnvFile();
        SpringApplication.run(ChatEscrowApplication.class, args);
    }

    /**
     * Loads .env from the project root (or parent dirs) into System properties.
     * Runs before Spring context starts so @Value bindings pick up the values.
     * Skips VITE_ keys (frontend only) and skips keys already set with a non-blank value.
     */
    private static void loadEnvFile() {
        File[] candidates = new File[] {
            new File(".env"),
            new File("../.env"),
            new File("../../.env")
        };
        for (File file : candidates) {
            if (file.exists() && file.isFile()) {
                try {
                    List<String> lines = Files.readAllLines(file.toPath());
                    int loaded = 0;
                    for (String line : lines) {
                        line = line.trim();
                        if (line.isEmpty() || line.startsWith("#")) continue;
                        int idx = line.indexOf('=');
                        if (idx > 0) {
                            String key = line.substring(0, idx).trim();
                            String val = line.substring(idx + 1).trim();
                            if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
                                val = val.substring(1, val.length() - 1).trim();
                            }
                            if (!val.isBlank() && !val.equals("CONFIGURE_ME")) {
                                System.setProperty(key, val);
                                if (key.equals("PAYPAL_CLIENT_ID")) System.setProperty("paypal.client-id", val);
                                if (key.equals("PAYPAL_CLIENT_SECRET")) System.setProperty("paypal.client-secret", val);
                                if (key.equals("PAYPAL_BASE_URL")) System.setProperty("paypal.base-url", val);
                                if (key.equals("PAYPAL_WEBHOOK_ID")) System.setProperty("paypal.webhook-id", val);
                                if (key.equals("PAYPAL_ENABLE_PAYOUTS")) System.setProperty("paypal.enable-payouts", val);
                                if (key.equals("AI_API_KEY")) System.setProperty("ai.api-key", val);
                                if (key.equals("AI_MODEL")) System.setProperty("ai.model", val);
                                if (key.equals("AI_BASE_URL")) System.setProperty("ai.base-url", val);
                                loaded++;
                            }
                        }
                    }
                    System.out.println("[ChatEscrow] Loaded " + loaded + " env var(s) from: " + file.getAbsolutePath());
                    break;
                } catch (Exception e) {
                    System.err.println("[ChatEscrow] Failed to load .env: " + e.getMessage());
                }
            }
        }
    }
}

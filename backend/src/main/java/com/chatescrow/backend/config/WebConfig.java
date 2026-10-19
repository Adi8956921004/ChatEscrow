package com.chatescrow.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Arrays;
import java.util.List;

@Configuration
public class WebConfig {

    @Value("${chatescrow.cors.allowed-origins:http://localhost:5173}")
    private String allowedOriginsStr;

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        List<String> origins = Arrays.asList(allowedOriginsStr.split(","));
        config.setAllowedOrigins(origins);
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Actor-Role", "X-Actor-Id", "PayPal-Request-Id"));
        config.setAllowCredentials(false);
        source.registerCorsConfiguration("/api/**", config);
        return new CorsFilter(source);
    }

    @Bean
    public WebClient webClient() {
        return WebClient.builder().build();
    }
}

package com.bookland.file.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class SupabaseStorageService {

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.service-key}")
    private String serviceKey;

    @Value("${supabase.bucket}")
    private String bucket;

    private final RestTemplate restTemplate = new RestTemplate();

    public String uploadImage(MultipartFile file) throws IOException {
        String fileName = UUID.randomUUID() + "-" + file.getOriginalFilename();

        String uploadUrl = supabaseUrl
                + "/storage/v1/object/"
                + bucket + "/" + fileName;

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(serviceKey);
        headers.setContentType(MediaType.parseMediaType(file.getContentType()));

        HttpEntity<byte[]> request = new HttpEntity<>(file.getBytes(), headers);

        restTemplate.exchange(
                uploadUrl,
                HttpMethod.POST,
                request,
                String.class
        );

        // Public URL
        return supabaseUrl
                + "/storage/v1/object/public/"
                + bucket + "/" + fileName;
    }

    public Page<Map<String, Object>> listImages(Pageable pageable) {
        String listUrl = supabaseUrl
                + "/storage/v1/object/list/"
                + bucket;

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(serviceKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = new HashMap<>();
        body.put("prefix", "");
        body.put("limit", pageable.getPageSize());
        body.put("offset", pageable.getOffset());

        // Handle sorting
        Map<String, Object> sortBy = new HashMap<>();
        if (pageable.getSort().isSorted()) {
            Sort.Order order = pageable.getSort().iterator().next();
            sortBy.put("column", order.getProperty());
            sortBy.put("order", order.getDirection().name().toLowerCase());
        } else {
             sortBy.put("column", "created_at");
             sortBy.put("order", "desc");
        }
        body.put("sortBy", sortBy);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        ResponseEntity<List> response = restTemplate.exchange(
                listUrl,
                HttpMethod.POST,
                request,
                List.class
        );

        List<Map<String, Object>> files = response.getBody();

        if (files != null) {
            files.forEach(file -> {
                String name = (String) file.get("name");
                String publicUrl = supabaseUrl
                        + "/storage/v1/object/public/"
                        + bucket + "/" + name;
                file.put("publicUrl", publicUrl);
            });
        }
        
        long totalEstimate = pageable.getOffset() + (files != null ? files.size() : 0);
        if (files != null && files.size() == pageable.getPageSize()) {
             totalEstimate += 1;
        }

        return new PageImpl<>(files != null ? files : List.of(), pageable, totalEstimate);
    }
    
    public void deleteImage(String fileName) {
        String deleteUrl = supabaseUrl
                + "/storage/v1/object/"
                + bucket + "/" + fileName;

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(serviceKey);

        HttpEntity<Void> request = new HttpEntity<>(headers);

        try {
            restTemplate.exchange(
                    deleteUrl,
                    HttpMethod.DELETE,
                    request,
                    String.class
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete image: " + e.getMessage());
        }
    }
}

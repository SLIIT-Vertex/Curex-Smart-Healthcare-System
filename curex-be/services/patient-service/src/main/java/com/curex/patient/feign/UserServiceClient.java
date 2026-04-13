package com.curex.patient.feign;

import com.curex.patient.feign.dto.InternalUserResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "user-service", url = "${services.user.url:http://localhost:8081}")
public interface UserServiceClient {

    @GetMapping("/api/internal/users/{id}")
    InternalUserResponse getUserById(@PathVariable("id") String id);
}

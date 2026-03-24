package com.curex.doctor.feign;

import com.curex.doctor.feign.dto.ApprovedUserFeignDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@FeignClient(name = "user-service", url = "${services.user.url:http://localhost:8081}")
public interface UserServiceClient {

    @GetMapping("/api/internal/users/approved/by-role/{role}")
    List<ApprovedUserFeignDto> getApprovedUsersByRole(@PathVariable("role") String role);
}

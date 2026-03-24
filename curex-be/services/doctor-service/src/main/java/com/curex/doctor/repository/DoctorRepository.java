package com.curex.doctor.repository;

import com.curex.doctor.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DoctorRepository extends JpaRepository<Doctor, String> {

    Optional<Doctor> findByUserId(String userId);

    Optional<Doctor> findByEmail(String email);

    List<Doctor> findBySpecializationContainingIgnoreCase(String specialization);

    boolean existsByEmail(String email);

    boolean existsByUserId(String userId);
}

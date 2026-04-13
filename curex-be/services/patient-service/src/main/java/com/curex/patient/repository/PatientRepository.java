package com.curex.patient.repository;

import com.curex.patient.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PatientRepository extends JpaRepository<Patient, String> {

    Optional<Patient> findByUserId(String userId);

    boolean existsByUserId(String userId);

    long deleteByUserId(String userId);
}

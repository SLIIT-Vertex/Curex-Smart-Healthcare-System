package com.curex.patient.repository;

import com.curex.patient.entity.MedicalHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MedicalHistoryRepository extends JpaRepository<MedicalHistory, String> {

    Optional<MedicalHistory> findByPatient_Id(String patientId);
}

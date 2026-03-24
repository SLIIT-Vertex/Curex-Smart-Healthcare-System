package com.curex.patient.repository;

import com.curex.patient.entity.EmergencyContact;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmergencyContactRepository extends JpaRepository<EmergencyContact, String> {

    Optional<EmergencyContact> findByPatient_Id(String patientId);
}

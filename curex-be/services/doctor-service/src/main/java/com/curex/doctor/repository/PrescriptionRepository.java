package com.curex.doctor.repository;

import com.curex.doctor.entity.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PrescriptionRepository extends JpaRepository<Prescription, String> {

    List<Prescription> findByPatientIdOrderByIssuedAtDesc(String patientId);

    List<Prescription> findByDoctor_IdOrderByIssuedAtDesc(String doctorId);

    boolean existsByAppointmentId(String appointmentId);
}

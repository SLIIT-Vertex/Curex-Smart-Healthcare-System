package com.healthcare.telemedicine.repository;

import com.healthcare.telemedicine.entity.SessionStatus;
import com.healthcare.telemedicine.entity.TelemedicineSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TelemedicineSessionRepository extends JpaRepository<TelemedicineSession, String> {

    Optional<TelemedicineSession> findTopByAppointmentIdOrderByCreatedAtDesc(String appointmentId);

    Optional<TelemedicineSession> findTopByAppointmentIdAndStatusNotOrderByCreatedAtDesc(
            String appointmentId,
            SessionStatus status
    );

    List<TelemedicineSession> findByDoctorIdOrderByCreatedAtDesc(String doctorId);

    List<TelemedicineSession> findByPatientIdOrderByCreatedAtDesc(String patientId);
}

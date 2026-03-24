package com.curex.doctor.repository;

import com.curex.doctor.entity.DoctorAvailability;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DoctorAvailabilityRepository extends JpaRepository<DoctorAvailability, String> {

    List<DoctorAvailability> findByDoctor_IdOrderByDayAscStartTimeAsc(String doctorId);
}

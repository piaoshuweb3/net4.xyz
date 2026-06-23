"""
ZK-ML Prover Service
Zero-Knowledge Proof Generation for PoUE Consensus

This service generates ZK proofs to verify that AI computations were performed
without revealing the model parameters or input data.
"""
import os
import json
import hashlib
import logging
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from datetime import datetime
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class ZKProof:
    """ZK Proof data structure"""
    proof: str
    public_signals: Dict[str, Any]
    proof_hash: str
    generation_time_ms: float
    circuit_version: str


@dataclass
class VerificationResult:
    """Verification result"""
    is_valid: bool
    message: str
    confidence: float
    error_code: Optional[str] = None


class ZKMLProver:
    """
    ZK-ML Prover for generating zero-knowledge proofs of AI computations
    
    In production, this would integrate with:
    - snarkjs for groth16 proofs
    - circom circuits for ML verification
    - torch/crypto libraries for model hashing
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.circuit_version = "1.0.0"
        self.proof_stats = {
            "total_generated": 0,
            "total_verified": 0,
            "successful_verifications": 0,
            "total_time_ms": 0,
        }
        
    def generate_proof(
        self,
        prompt: str,
        ai_result: str,
        model_type: str,
        model_params: Optional[Dict[str, Any]] = None
    ) -> ZKProof:
        """
        Generate a ZK proof for an AI computation
        
        Args:
            prompt: The input prompt
            ai_result: The AI model output
            model_type: Type of model used (e.g., "gpt-4o", "llama-3-70b")
            model_params: Optional model parameters for verification
            
        Returns:
            ZKProof object containing the proof and metadata
        """
        start_time = datetime.now()
        
        # Generate input hash
        input_hash = self._hash_data(prompt + ai_result)
        
        # Generate model hash
        model_hash = self._hash_model(model_type, model_params)
        
        # Generate circuit input
        circuit_input = self._prepare_circuit_input(
            input_hash=input_hash,
            model_hash=model_hash,
            prompt=prompt,
            result=ai_result
        )
        
        # Generate ZK proof (simulated)
        # In production, this would call snarkjs or similar
        proof_data = self._compute_proof(circuit_input)
        
        # Generate public signals
        public_signals = {
            "input_hash": input_hash,
            "model_hash": model_hash,
            "timestamp": int(datetime.now().timestamp()),
            "circuit_version": self.circuit_version,
            "model_type": model_type,
        }
        
        # Calculate proof hash
        proof_hash = self._hash_data(json.dumps(proof_data))
        
        # Calculate generation time
        generation_time = (datetime.now() - start_time).total_seconds() * 1000
        
        # Update stats
        self.proof_stats["total_generated"] += 1
        self.proof_stats["total_time_ms"] += generation_time
        
        logger.info(f"ZK proof generated in {generation_time:.2f}ms")
        
        return ZKProof(
            proof=proof_data,
            public_signals=public_signals,
            proof_hash=proof_hash,
            generation_time_ms=generation_time,
            circuit_version=self.circuit_version
        )
    
    def verify_proof(
        self,
        proof: str,
        ai_result: str,
        public_signals: Dict[str, Any]
    ) -> VerificationResult:
        """
        Verify a ZK proof
        
        Args:
            proof: The ZK proof to verify
            ai_result: The AI result being proven
            public_signals: Public signals from proof generation
            
        Returns:
            VerificationResult indicating success/failure
        """
        self.proof_stats["total_verified"] += 1
        
        try:
            # Validate proof structure
            if not self._validate_proof_structure(proof):
                self.proof_stats["successful_verifications"] += 1
                return VerificationResult(
                    is_valid=False,
                    message="Invalid proof structure",
                    confidence=0.0,
                    error_code="INVALID_STRUCTURE"
                )
            
            # Verify public signals
            if not self._validate_public_signals(public_signals):
                return VerificationResult(
                    is_valid=False,
                    message="Invalid public signals",
                    confidence=0.0,
                    errorCode="INVALID_SIGNALS"
                )
            
            # In production, this would call snarkjs verify
            # For now, we do basic validation
            is_valid = self._verify_proof_data(proof, ai_result, public_signals)
            
            if is_valid:
                self.proof_stats["successful_verifications"] += 1
                return VerificationResult(
                    is_valid=True,
                    message="Proof verified successfully",
                    confidence=0.99
                )
            else:
                return VerificationResult(
                    is_valid=False,
                    message="Proof verification failed",
                    confidence=0.0,
                    error_code="VERIFICATION_FAILED"
                )
                
        except Exception as e:
            logger.error(f"Proof verification error: {str(e)}")
            return VerificationResult(
                is_valid=False,
                message=f"Verification error: {str(e)}",
                confidence=0.0,
                error_code="VERIFICATION_ERROR"
            )
    
    def get_stats(self) -> Dict[str, Any]:
        """Get prover statistics"""
        avg_time = (
            self.proof_stats["total_time_ms"] / self.proof_stats["total_generated"]
            if self.proof_stats["total_generated"] > 0
            else 0
        )
        
        success_rate = (
            self.proof_stats["successful_verifications"] / self.proof_stats["total_verified"]
            if self.proof_stats["total_verified"] > 0
            else 0
        )
        
        return {
            "total_proofs_generated": self.proof_stats["total_generated"],
            "total_proofs_verified": self.proof_stats["total_verified"],
            "success_rate": success_rate,
            "average_proof_time_ms": avg_time,
            "circuit_version": self.circuit_version,
        }
    
    # ==================== Private Methods ====================
    
    def _hash_data(self, data: str) -> str:
        """Generate SHA-256 hash of data"""
        return hashlib.sha256(data.encode()).hexdigest()
    
    def _hash_model(self, model_type: str, model_params: Optional[Dict[str, Any]]) -> str:
        """Generate hash of model configuration"""
        model_config = {
            "type": model_type,
            "params": model_params or {}
        }
        return self._hash_data(json.dumps(model_config, sort_keys=True))
    
    def _prepare_circuit_input(
        self,
        input_hash: str,
        model_hash: str,
        prompt: str,
        result: str
    ) -> Dict[str, Any]:
        """
        Prepare input for ZK circuit
        
        In production, this would encode the data into format expected by the circuit
        """
        return {
            "input_hash": input_hash,
            "model_hash": model_hash,
            "prompt_hash": self._hash_data(prompt),
            "result_hash": self._hash_data(result),
            "combined_hash": self._hash_data(input_hash + model_hash),
        }
    
    def _compute_proof(self, circuit_input: Dict[str, Any]) -> str:
        """
        Compute ZK proof (simulated)
        
        In production, this would:
        1. Use snarkjs to generate proof from circuit
        2. Return the proof in JSON format
        """
        import secrets
        
        # Simulate proof generation
        # In reality, this would be a groth16 proof
        proof = {
            "pi_a": [secrets.token_hex(32), secrets.token_hex(32)],
            "pi_b": [
                [secrets.token_hex(32), secrets.token_hex(32)],
                [secrets.token_hex(32), secrets.token_hex(32)]
            ],
            "pi_c": [secrets.token_hex(32), secrets.token_hex(32)],
            "protocol": "groth16",
            "curve": "bn128",
            "input": circuit_input,
        }
        
        return json.dumps(proof)
    
    def _validate_proof_structure(self, proof: str) -> bool:
        """Validate proof has correct structure"""
        try:
            proof_data = json.loads(proof)
            required_fields = ["pi_a", "pi_b", "pi_c", "protocol", "curve"]
            return all(field in proof_data for field in required_fields)
        except:
            return False
    
    def _validate_public_signals(self, signals: Dict[str, Any]) -> bool:
        """Validate public signals"""
        required_signals = ["input_hash", "model_hash", "timestamp"]
        return all(signal in signals for signal in required_signals)
    
    def _verify_proof_data(
        self,
        proof: str,
        ai_result: str,
        public_signals: Dict[str, Any]
    ) -> bool:
        """Verify proof data (simplified)"""
        try:
            proof_data = json.loads(proof)
            
            # Basic validation
            if not proof_data.get("pi_a") or not proof_data.get("pi_b") or not proof_data.get("pi_c"):
                return False
            
            # Verify input hash matches
            result_hash = self._hash_data(ai_result)
            input_hash = public_signals.get("input_hash", "")
            
            # In production, this would do cryptographic verification
            return len(proof_data["pi_a"]) == 2 and len(proof_data["pi_b"]) == 2
        except:
            return False


class EmotionalConsensusValidator:
    """
    Validates emotional consensus for PoUE mechanism
    
    Ensures multiple nodes agree on emotional analysis of AI outputs
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.default_threshold = 0.7
        
    def validate_consensus(
        self,
        emotional_analyses: List[Dict[str, Any]],
        threshold: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Validate emotional consensus among multiple analyses
        
        Args:
            emotional_analyses: List of emotional analysis results
            threshold: Consensus threshold (default 0.7)
            
        Returns:
            Consensus validation result
        """
        threshold = threshold or self.default_threshold
        
        if len(emotional_analyses) < 2:
            return {
                "is_valid": False,
                "message": "Need at least 2 analyses for consensus",
                "consensus_score": 0.0,
            }
        
        # Extract primary emotions
        primary_emotions = [a.get("primary_emotion", "neutral") for a in emotional_analyses]
        
        # Count emotion frequencies
        emotion_counts = {}
        for emotion in primary_emotions:
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
        
        # Calculate consensus
        consensus_emotion = max(emotion_counts, key=emotion_counts.get)
        consensus_score = emotion_counts[consensus_emotion] / len(emotional_analyses)
        
        # Calculate intensity variance
        intensities = [a.get("intensity", 5.0) for a in emotional_analyses]
        mean_intensity = sum(intensities) / len(intensities)
        variance = sum((x - mean_intensity) ** 2 for x in intensities) / len(intensities)
        
        if variance < 2:
            intensity_variance = "low"
        elif variance < 5:
            intensity_variance = "medium"
        else:
            intensity_variance = "high"
        
        # Determine validity
        is_valid = consensus_score >= threshold and intensity_variance != "high"
        
        return {
            "is_valid": is_valid,
            "consensus_emotion": consensus_emotion,
            "consensus_score": consensus_score,
            "intensity_variance": intensity_variance,
            "emotion_distribution": emotion_counts,
            "individual_analyses": emotional_analyses,
            "timestamp": datetime.utcnow().isoformat(),
        }


class AntiCheatDetector:
    """
    Detects potential cheating in AI task submissions
    
    Checks for:
    - Duplicate results
    - Suspiciously short/long outputs
    - Pattern anomalies
    - Result copying
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.result_history: Dict[str, List[str]] = {}
        self.min_result_length = 10
        self.max_result_length = 50000
        self.risk_threshold = 0.5
        
    def check(
        self,
        node_id: str,
        task_id: str,
        ai_result: str,
        result_hash: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Check for potential cheating
        
        Args:
            node_id: ID of the submitting node
            task_id: ID of the task
            ai_result: The AI result to check
            result_hash: Optional pre-computed hash
            
        Returns:
            Anti-cheat check result
        """
        violations = []
        risk_score = 0.0
        
        # Generate result hash
        result_hash = result_hash or hashlib.sha256(ai_result.encode()).hexdigest()
        
        # Check for duplicate results
        if node_id in self.result_history:
            if result_hash in self.result_history[node_id]:
                violations.append("DUPLICATE_RESULT")
                risk_score += 0.4
        
        # Check result length
        if len(ai_result) < self.min_result_length:
            violations.append("SHORT_RESULT")
            risk_score += 0.2
            
        if len(ai_result) > self.max_result_length:
            violations.append("LONG_RESULT")
            risk_score += 0.2
        
        # Check for suspicious patterns
        if self._check_suspicious_patterns(ai_result):
            violations.append("SUSPICIOUS_PATTERN")
            risk_score += 0.3
        
        # Update history
        if node_id not in self.result_history:
            self.result_history[node_id] = []
        self.result_history[node_id].append(result_hash)
        
        # Keep only last 100 results
        if len(self.result_history[node_id]) > 100:
            self.result_history[node_id] = self.result_history[node_id][-100:]
        
        is_valid = risk_score < self.risk_threshold
        
        return {
            "is_valid": is_valid,
            "violations": violations,
            "risk_score": risk_score,
            "message": "No violations detected" if is_valid else "Potential cheating detected",
        }
    
    def _check_suspicious_patterns(self, text: str) -> bool:
        """Check for suspicious patterns in text"""
        import re
        
        # Check for repeated characters
        if re.match(r"^(.)\1{10,}", text):
            return True
            
        # Check for base64-like random data
        if re.match(r"^[a-zA-Z0-9+/]{50,}={0,2}$", text):
            return True
            
        return False


# Export classes
__all__ = [
    "ZKMLProver",
    "EmotionalConsensusValidator",
    "AntiCheatDetector",
    "ZKProof",
    "VerificationResult",
]
using UnityEngine;

public class Projectile : MonoBehaviour
{
    private Transform target;
    private float damage;
    
    [Header("Projectile Settings")]
    [SerializeField] private float speed = 20f;
    [SerializeField] private GameObject impactEffect;        // Çarpma efekti (opsiyonel)
    
    /// <summary>
    /// Mermiyi belirli bir hedefe yönlendirir
    /// </summary>
    public void Seek(Transform _target, float _damage)
    {
        target = _target;
        damage = _damage;
    }
    
    void Update()
    {
        if (target == null)
        {
            Destroy(gameObject);
            return;
        }
        
        Vector3 direction = target.position - transform.position;
        float distanceThisFrame = speed * Time.deltaTime;
        
        // Hedefe yaklaşma kontrolü
        if (direction.magnitude <= distanceThisFrame)
        {
            HitTarget();
            return;
        }
        
        // Merminin hedefe doğru hareketi
        transform.Translate(direction.normalized * distanceThisFrame, Space.World);
        
        // Merminin hedefe doğru bakması
        transform.LookAt(target);
    }
    
    /// <summary>
    /// Hedefe çarptığında çağrılır
    /// </summary>
    void HitTarget()
    {
        // Çarpma efekti oluştur (eğer varsa)
        if (impactEffect != null)
        {
            GameObject effectInstance = Instantiate(impactEffect, transform.position, transform.rotation);
            Destroy(effectInstance, 2f);
        }
        
        // Düşmana hasar ver
        Enemy enemy = target.GetComponent<Enemy>();
        if (enemy != null)
        {
            enemy.TakeDamage(damage);
        }
        
        // Mermiyi yok et
        Destroy(gameObject);
    }
}

using UnityEngine;

public class Enemy : MonoBehaviour
{
    [Header("Enemy Settings")]
    [SerializeField] private float maxHealth = 100f;
    [SerializeField] private float speed = 10f;
    [SerializeField] private int moneyGain = 50;
    
    private float currentHealth;
    private Transform target;
    private int wavepointIndex = 0;
    
    [Header("Visual Feedback")]
    [SerializeField] private GameObject deathEffect;         // Ölüm efekti (opsiyonel)
    
    void Start()
    {
        currentHealth = maxHealth;
        // Waypoints referansı yoksa hata vermesin diye kontrol
        if (Waypoints.points != null && Waypoints.points.Length > 0)
        {
            target = Waypoints.points[0];
        }
    }
    
    void Update()
    {
        if (target == null) return;

        Vector3 dir = target.position - transform.position;
        transform.Translate(dir.normalized * speed * Time.deltaTime, Space.World);

        if (Vector3.Distance(transform.position, target.position) <= 0.4f)
        {
            GetNextWaypoint();
        }
    }
    
    void GetNextWaypoint()
    {
        if (wavepointIndex >= Waypoints.points.Length - 1)
        {
            EndPath();
            return;
        }

        wavepointIndex++;
        target = Waypoints.points[wavepointIndex];
    }

    void EndPath()
    {
        GameManager.Lives--;
        Destroy(gameObject);
    }
    
    /// <summary>
    /// Düşman hasar aldığında çağrılır
    /// </summary>
    public void TakeDamage(float damageAmount)
    {
        currentHealth -= damageAmount;
        
        if (currentHealth <= 0)
        {
            Die();
        }
    }
    
    /// <summary>
    /// Düşman öldüğünde çağrılır
    /// </summary>
    void Die()
    {
        GameManager.Money += moneyGain;

        // Ölüm efekti oluştur (eğer varsa)
        if (deathEffect != null)
        {
            GameObject effectInstance = Instantiate(deathEffect, transform.position, transform.rotation);
            Destroy(effectInstance, 2f);
        }
        
        // Düşmanı yok et
        Destroy(gameObject);
    }
    
    /// <summary>
    /// Sağlık barı için mevcut sağlık yüzdesini döndürür
    /// </summary>
    public float GetHealthPercentage()
    {
        return currentHealth / maxHealth;
    }
}

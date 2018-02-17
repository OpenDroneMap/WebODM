from django.test import TestCase
from app.testwatch import TestWatch


def test(a, b):
    return a + b

class TestTestWatch(TestCase):
    def test_methods(self):
        tw = TestWatch()
        self.assertTrue(tw.get_calls_count("app.tests.test_testwatch.test") == 0)
        self.assertTrue(tw.get_calls_count("app.tests.test_testwatch.nonexistent") == 0)

        # Test watch count
        tw.hook_pre(test, 1, 2)
        test(1, 2)
        tw.hook_post(test, 1, 2)

        self.assertTrue(tw.get_calls_count("app.tests.test_testwatch.test") == 1)

        tw.hook_pre(test, 1, 2)
        test(1, 2)
        tw.hook_post(test, 1, 2)

        self.assertTrue(tw.get_calls_count("app.tests.test_testwatch.test") == 2)

        @TestWatch.watch(testWatch=tw)
        def test2(d):
            d['flag'] = not d['flag']

        # Test intercept
        tw.intercept("app.tests.test_testwatch.test2")
        d = {'flag': True}
        test2(d)
        self.assertTrue(d['flag'])

        # Test function replacement intercept
        d = {
            'a': False,
            'b': False
        }
        @TestWatch.watch(testWatch=tw)
        def test3(d):
            d['a'] = True

        def replacement(d):
            d['b'] = True

        tw.intercept("app.tests.test_testwatch.test3", replacement)
        test3(d)
        self.assertFalse(d['a'])
        self.assertTrue(d['b'])


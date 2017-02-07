from django.test import TestCase

from app.testwatch import TestWatch


def test(a, b):
    return a + b

class TestTestWatch(TestCase):
    def test_methods(self):
        tw = TestWatch()

        self.assertTrue(tw.get_calls_count("app.tests.test_testwatch.test") == 0)
        self.assertTrue(tw.get_calls_count("app.tests.test_testwatch.nonexistant") == 0)

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



